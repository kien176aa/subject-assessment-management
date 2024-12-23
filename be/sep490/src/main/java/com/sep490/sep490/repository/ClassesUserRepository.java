package com.sep490.sep490.repository;

import com.sep490.sep490.entity.ClassUser;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

public interface ClassesUserRepository extends BaseRepository<ClassUser,Integer>{

    @Query("SELECT cu FROM ClassUser cu WHERE cu.classes.id = :classId")
    List<ClassUser> findAllByClassId(@Param("classId") Integer classId);
    @Query("SELECT cu FROM ClassUser cu " +
            "WHERE (:classId IS NULL OR cu.classes.id = :classId) " +
            "AND (:keyWord IS NULL OR LOWER(cu.user.fullname) LIKE LOWER(CONCAT('%', :keyWord, '%')) " +
            "OR LOWER(cu.user.email) LIKE LOWER(CONCAT('%', :keyWord, '%'))) " +
            "AND (:roleId IS NULL OR cu.user.role.id = :roleId)")
    Page<ClassUser> search(@Param("classId") Integer classId,
                           @Param("keyWord") String keyWord,
                           @Param("roleId") Integer roleId,
                           Pageable pageable);
    @Query("SELECT cu FROM ClassUser cu WHERE cu.classes.id = :classId AND cu.user.role.id =:roleId")
    List<ClassUser> findAllByClassIdAndRole(@Param("classId") Integer classId,@Param("roleId") Integer roleId);

    @Query("SELECT cu FROM ClassUser cu WHERE cu.classes.id = :classId AND cu.user.id = :userId")
    ClassUser findByClassIdAndUserId(@Param("classId") Integer classId, @Param("userId") Integer userId);
    @Modifying
    @Query("DELETE FROM ClassUser cu WHERE cu.classes.id = :classId AND cu.user.id = :userId")
    void deleteByClassIdAndUserId(@Param("classId") Integer classId, @Param("userId") Integer userId);
}
