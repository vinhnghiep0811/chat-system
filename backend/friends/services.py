from .models import Friendship

def are_friends(a_id: int, b_id: int) -> bool:
    u1, u2 = Friendship.normalize_pair(a_id, b_id)
    return Friendship.objects.filter(user1_id=u1, user2_id=u2).exists()
